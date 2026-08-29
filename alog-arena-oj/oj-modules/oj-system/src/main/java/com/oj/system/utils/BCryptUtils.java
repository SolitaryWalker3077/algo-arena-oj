package com.oj.system.utils;


import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 加密算法工具类
 * */
public class BCryptUtils {

    /**
     *  生成加密后密文
     * @param password 密码
     * @return 加密后的字符串
     */
    public static String encryptPassword(String password) {
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        return passwordEncoder.encode(password);
    }

    /**
     *  判断密码是否相同
     * @param rawPassword 数据库查询真实密码
     * @param encodedPassword 加密后的密码
     * @return 结果
     * */
    public static boolean matchesPassword(String rawPassword,String encodedPassword) {
        BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        return passwordEncoder.matches(rawPassword,encodedPassword);
    }
}
