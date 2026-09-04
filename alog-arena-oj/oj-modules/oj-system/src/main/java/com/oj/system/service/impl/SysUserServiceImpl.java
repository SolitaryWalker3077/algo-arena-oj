package com.oj.system.service.impl;

import cn.hutool.core.lang.UUID;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.JwtConstants;
import com.oj.common.entity.Result;
import com.oj.common.enums.ResultCode;
import com.oj.common.enums.UserIdentify;
import com.oj.redis.service.RedisService;
import com.oj.security.utils.JwtUtils;
import com.oj.system.entity.LoginUser;
import com.oj.system.entity.SysUserInfo;
import com.oj.system.mapper.SysUserMapper;
import com.oj.system.service.ISysUserService;
import com.oj.system.utils.BCryptUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RefreshScope
public class SysUserServiceImpl implements ISysUserService {

    @Autowired
    private SysUserMapper sysUserMapper;

    @Value("${jwt.secret}")
    private String secret;

    @Autowired
    private RedisService redisService;

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
            //用jwt生成token
            Map<String,Object> claims = new HashMap<>();
            String userKey = UUID.fastUUID().toString();//UUID唯一通识码
            claims.put(JwtConstants.LOGIN_USER_ID,sysUserInfo.getUserId());
            claims.put(JwtConstants.LOGIN_USER_KEY,userKey);
            String token = JwtUtils.createToken(claims, secret);
            //用第三方机制去存储敏感信息,例如redis
            //身份认证具体存的信息: redis 表示用户身份字段 identity 1 表示普通用户   2 表示管理员用户

            String key = CacheConstants.LOGIN_TOKEN_KEY + userKey; //通过UUID保证key的全局唯一性

            LoginUser loginUser = new LoginUser();
            loginUser.setIdentity(UserIdentify.ADMIN.getValue());

            redisService.setCacheObject(key,loginUser, CacheConstants.EXP, TimeUnit.MINUTES); //过期时间设置为720min
            return Result.success(token);
        }

        return Result.fail(ResultCode.FAILED_LOGIN);
    }
}
