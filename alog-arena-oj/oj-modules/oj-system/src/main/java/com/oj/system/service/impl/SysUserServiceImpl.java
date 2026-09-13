package com.oj.system.service.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.entity.LoginUser;
import com.oj.common.entity.Result;
import com.oj.common.entity.vo.LoginUserVO;
import com.oj.common.enums.ResultCode;
import com.oj.common.enums.UserIdentify;
import com.oj.security.expection.ServiceException;
import com.oj.security.service.TokenService;
import com.oj.system.entity.sysuser.SysUserInfo;
import com.oj.system.entity.sysuser.dto.SysUserDto;
import com.oj.system.mapper.SysUserMapper;
import com.oj.system.service.ISysUserService;
import com.oj.system.utils.BCryptUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RefreshScope
public class SysUserServiceImpl implements ISysUserService {

    @Autowired
    private SysUserMapper sysUserMapper;

    @Value("${jwt.secret}")
    private String secret;

    @Autowired
    private TokenService tokenService;

    @Override
    public Result<String> login(String userAccount, String password) {
        //通过账号去数据库中查询，对应的用户信息
        LambdaQueryWrapper<SysUserInfo> queryWrapper = new LambdaQueryWrapper<>();
        //查询用户id,用户密码和用户昵称
        SysUserInfo sysUserInfo = sysUserMapper.selectOne(queryWrapper
                .select(SysUserInfo::getUserId, SysUserInfo::getPassword,SysUserInfo::getNickName)
                .eq(SysUserInfo::getUserAccount,userAccount));

        if(sysUserInfo == null) {
            return Result.fail(ResultCode.FAILED_USER_NOT_EXISTS);
        }
        if(BCryptUtils.matchesPassword(password,sysUserInfo.getPassword())) {
            //jwttoken = 生产jwttoken方法
            String token = tokenService.createToken(sysUserInfo.getUserId(),
                    secret, UserIdentify.ADMIN.getValue(),sysUserInfo.getNickName());

            return Result.success(token);
        }

        return Result.fail(ResultCode.FAILED_LOGIN);
    }

    @Override
    public boolean logout(String token) {
        return tokenService.deleteLoginUser(token,secret);

    }

    @Override
    public Result<LoginUserVO> info(String token) {
        LoginUser loginUser = tokenService.getLoginUser(token, secret);
        if(loginUser == null) {
            return Result.fail(ResultCode.FAILED_UNAUTHORIZED);
        }
        LoginUserVO  loginUserVO = new LoginUserVO();
        loginUserVO.setNickName(loginUser.getNickName());
        return Result.success(loginUserVO) ;
    }

    @Override
    public int add(SysUserDto sysUserSaveDTO) {
//        checkParams(sysUserSaveDTO);
        //重复
        //将dto转为实体
        List<SysUserInfo> sysUserList = sysUserMapper.selectList(new LambdaQueryWrapper<SysUserInfo>()
                .eq(SysUserInfo::getUserAccount, sysUserSaveDTO.getUserAccount()));
        if (CollectionUtil.isNotEmpty(sysUserList)) {
            //用户已经存在
            //自定义的异常   公共的异常类
            throw new ServiceException(ResultCode.AILED_USER_EXISTS);
        }
        SysUserInfo sysUser = new SysUserInfo();
        sysUser.setUserAccount(sysUserSaveDTO.getUserAccount());
        sysUser.setPassword(BCryptUtils.encryptPassword(sysUserSaveDTO.getPassword()));
//        sysUser.setCreateBy(1L);
//        sysUser.setCreateTime(LocalDateTime.now());
        return sysUserMapper.insert(sysUser);
    }
}
