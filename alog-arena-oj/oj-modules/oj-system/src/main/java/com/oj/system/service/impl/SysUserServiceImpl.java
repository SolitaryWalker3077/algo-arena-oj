package com.oj.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.JwtConstants;
import com.oj.common.entity.Result;
import com.oj.common.enums.ResultCode;
import com.oj.common.enums.UserIdentify;
import com.oj.redis.service.RedisService;
import com.oj.security.service.TokenService;
import com.oj.system.entity.SysUserInfo;
import com.oj.system.mapper.SysUserMapper;
import com.oj.system.service.ISysUserService;
import com.oj.system.utils.BCryptUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Service;

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
                .select(SysUserInfo::getPassword).eq(SysUserInfo::getUserAccount,userAccount));
        if(sysUserInfo == null) {
            return Result.fail(ResultCode.FAILED_USER_NOT_EXISTS);
        }
        if(BCryptUtils.matchesPassword(password,sysUserInfo.getPassword())) {

            String token = tokenService.createToken(sysUserInfo.getUserId(),secret, UserIdentify.ADMIN.getValue());

            return Result.success(token);
        }

        return Result.fail(ResultCode.FAILED_LOGIN);
    }
}
