package com.oj.system.service.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.entity.Result;
import com.oj.common.enums.ResultCode;
import com.oj.common.enums.UserIdentify;
import com.oj.security.expection.ServiceException;
import com.oj.security.service.TokenService;
import com.oj.system.entity.SysUserInfo;
import com.oj.system.entity.dto.SysUserDto;
import com.oj.system.mapper.SysUserMapper;
import com.oj.system.service.ISysUserService;
import com.oj.system.utils.BCryptUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Date;
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
        SysUserInfo sysUserInfo = sysUserMapper.selectOne(queryWrapper
                .select(SysUserInfo::getUserId, SysUserInfo::getPassword).eq(SysUserInfo::getUserAccount,userAccount));
        if(sysUserInfo == null) {
            return Result.fail(ResultCode.FAILED_USER_NOT_EXISTS);
        }
        if(BCryptUtils.matchesPassword(password,sysUserInfo.getPassword())) {

            String token = tokenService.createToken(sysUserInfo.getUserId(),secret, UserIdentify.ADMIN.getValue());

            return Result.success(token);
        }

        return Result.fail(ResultCode.FAILED_LOGIN);
    }

    @Override
    public int add(SysUserDto sysUserSaveDTO) {
//        checkParams(sysUserSaveDTO);
        //重复
        //将dto转为实体
        List<SysUserInfo> sysUserList = sysUserMapper.selectList(new LambdaQueryWrapper<SysUserInfo>()
                .eq(SysUserInfo::getUserAccount, sysUserSaveDTO.getUserAccount()));
        //isNotEmpty  不为空返回true
//        if (sysUserList == null || sysUserList.size() == 0) {
//
//        }
        if (CollectionUtil.isNotEmpty(sysUserList)) {
            //用户已经存在
            //自定义的异常   公共的异常类
            throw new ServiceException(ResultCode.AILED_USER_EXISTS);
        }
        SysUserInfo sysUser = new SysUserInfo();
        sysUser.setUserAccount(sysUserSaveDTO.getUserAccount());
        sysUser.setPassword(BCryptUtils.encryptPassword(sysUserSaveDTO.getPassword()));
        sysUser.setCreateBy(1L);
        sysUser.setCreateTime(LocalDateTime.now());
        return sysUserMapper.insert(sysUser);
    }
}
