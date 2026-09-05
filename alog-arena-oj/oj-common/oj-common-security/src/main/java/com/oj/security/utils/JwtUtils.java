package com.oj.security.utils;

import com.oj.common.constants.JwtConstants;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

import java.util.Map;

public class JwtUtils {

    /**
     * ⽣成令牌
     *
     * @param claims 数据
     * @param secret 密钥
     * @return 令牌
     */
    public static String createToken(Map<String, Object> claims, String secret) {
        String token = Jwts.builder()
                .setClaims(claims)
                .signWith(SignatureAlgorithm.HS512, secret)
                .compact();
        return token;
    }
    /**
     * 从令牌中获取数据
     *
     * @param token 令牌
     * @param secret 密钥
     * @return 数据
     */
    public static Claims parseToken(String token, String secret) {
        return Jwts.parser()
                .setSigningKey(secret)
                .parseClaimsJws(token)
                .getBody();
    }


    public static String getUserKey (Map<String,Object> claims) {
        return toStr(claims.get(JwtConstants.LOGIN_USER_KEY));
    }

    public static String getUserId (Map<String , Object> claims) {
        return toStr(claims.get(JwtConstants.LOGIN_USER_ID));
    }

    public static String toStr(Object value) {
        if(value == null) {
            return "";
        }
        return value.toString();
    }



    //测试Jwt令牌生成
    //生成:eyJhbGciOiJIUzUxMiJ9.eyJ1c2VySWQiOjEyMzQ1Njc4OX0.b7zqHeghH-BqJbQqDEaiDn1lTo8BA1Uuu0OQm2fbo_Rl6EOVdomsB-fPCkJpI_GH-UCI9brSa6UYbjb44m1KgA
//    public static void main(String[] args) {
//        Map<String,Object> map = new HashMap<>();
//        map.put("userId",123456789L);
//        String secret = "123456";
//        System.out.println(createToken(map, secret));
//    }

    //测试从令牌当中得到用户数据
//    public static void main(String[] args) {
//        String token = "eyJhbGciOiJIUzUxMiJ9.eyJ1c2VySWQiOjEyMzQ1Njc4OX0.b7zqHeghH-BqJbQqDEaiDn1lTo8BA1Uuu0OQm2fbo_Rl6EOVdomsB-fPCkJpI_GH-UCI9brSa6UYbjb44m1KgA";
//        String secret = "123456";
//        System.out.println(parseToken(token, secret));
//    }


}
