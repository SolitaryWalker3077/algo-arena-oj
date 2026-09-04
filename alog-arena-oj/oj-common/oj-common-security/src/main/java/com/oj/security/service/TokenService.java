package com.oj.security.service;

import cn.hutool.core.lang.UUID;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.JwtConstants;
import com.oj.common.enums.UserIdentify;
import com.oj.redis.service.RedisService;
import com.oj.security.entity.LoginUser;
import com.oj.security.utils.JwtUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class TokenService {


    @Autowired
    private RedisService redisService;

    public String createToken(Long userId,String secret,Integer identity) {
        //用jwt生成token
        Map<String,Object> claims = new HashMap<>();
        String userKey = UUID.fastUUID().toString();//UUID唯一通识码
        claims.put(JwtConstants.LOGIN_USER_ID,userId);
        claims.put(JwtConstants.LOGIN_USER_KEY,userKey);
        String token = JwtUtils.createToken(claims, secret);
        //用第三方机制去存储敏感信息,例如redis
        //身份认证具体存的信息: redis 表示用户身份字段 identity 1 表示普通用户   2 表示管理员用户

        String key = CacheConstants.LOGIN_TOKEN_KEY + userKey; //通过UUID保证key的全局唯一性

        LoginUser loginUser = new LoginUser();
        loginUser.setIdentity(identity);

        redisService.setCacheObject(key,loginUser, CacheConstants.EXP, TimeUnit.MINUTES);
        return token; //过期时间设置为720min
    }
}
