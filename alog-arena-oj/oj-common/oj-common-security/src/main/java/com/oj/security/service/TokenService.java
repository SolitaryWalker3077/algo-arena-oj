package com.oj.security.service;

import cn.hutool.core.lang.UUID;
import cn.hutool.log.Log;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.JwtConstants;
import com.oj.redis.service.RedisService;
import com.oj.common.entity.LoginUser;
import com.oj.security.utils.JwtUtils;
import io.jsonwebtoken.Claims;
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

    public String createToken(Long userId,String secret,Integer identity,String nickName) {
        //用jwt生成token
        Map<String,Object> claims = new HashMap<>();
        String userKey = UUID.fastUUID().toString();//UUID唯一通识码
        claims.put(JwtConstants.LOGIN_USER_ID,userId);
        claims.put(JwtConstants.LOGIN_USER_KEY,userKey);
        String token = JwtUtils.createToken(claims, secret);
        //用第三方机制去存储敏感信息,例如redis
        //身份认证具体存的信息: redis 表示用户身份字段 identity 1 表示普通用户   2 表示管理员用户

        String tokenKey =getTokenKey(userKey); //通过UUID保证key的全局唯一性

        LoginUser loginUser = new LoginUser();
        loginUser.setIdentity(identity);
        loginUser.setNickName(nickName);
        redisService.setCacheObject(tokenKey,loginUser, CacheConstants.EXP, TimeUnit.MINUTES);
        return token; //过期时间设置为720min
    }


    //延长token的有效时间，就是延长redis当中存储的用于用户身份认证的敏感信息的有效时间
    //在身份认证通过之后才会调用，并且在请求到达controller层之前 在拦截器中调用
    public void extendToken(String token,String secret) {
        String userKey = getUserKey(token, secret);
        if(userKey == null) {
            return;
        }
        String tokenKey = getTokenKey(userKey);

        Long expire = redisService.getExpire(tokenKey, TimeUnit.MINUTES);
        if (expire == null && expire < CacheConstants.REFRESH_TIME) {
            //当时间小于180分钟的时候，将时间就进行一次延长，再设置回720分钟
            redisService.expire(tokenKey,CacheConstants.EXP,TimeUnit.MINUTES);
        }
    }


    public LoginUser getLoginUser(String token,String secret) {
        String userKey = getUserKey(token, secret);
        if (userKey == null) {
            return null;
        }
        return redisService.getCacheObject(getTokenKey(userKey),LoginUser.class);
    }

    public boolean deleteLoginUser(String token,String secret) {
        String userKey = getUserKey(token, secret);
        if (userKey == null) {
            return false;
        }
        return redisService.deleteObject(getTokenKey(userKey));
    }

    private String getTokenKey(String userKey) {
        return CacheConstants.LOGIN_TOKEN_KEY + userKey;
    }

    private String getUserKey(String token,String secret) {
        Claims claims;
        try {
            claims = JwtUtils.parseToken(token, secret); //获取令牌中信息  解析payload中信息  存储着用户唯一标识信息
            if (claims == null) {
                log.error("解析token：{}, 出现异常", token);
                return null;
            }
        } catch (Exception e) {
            log.error("解析token：{}, 出现异常", token, e);
            return null;
        }
        return JwtUtils.getUserKey(claims);
    }
}
