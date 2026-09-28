package com.oj.friend.service.impl;

import cn.hutool.core.util.RandomUtil;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.Constants;
import com.oj.common.enums.ResultCode;
import com.oj.friend.entity.dto.UserDto;
import com.oj.friend.service.IUserService;
import com.oj.message.service.AliSmsService;
import com.oj.redis.service.RedisService;
import com.oj.security.expection.ServiceException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class UserServiceImpl implements IUserService {


    @Autowired
    private AliSmsService aliSmsService;

    @Autowired
    private RedisService redisService;

    @Value("${sms.code-expiration: 5}")
    private Long phoneCodeExpiration;

    @Value("${sms.send-limit:3}")
    private Integer sendLimit;

    @Override
    public boolean sendCode(UserDto userDto) {
        if (!checkPhone(userDto.getPhone())) {
            throw new ServiceException(ResultCode.FAILED_USER_PHONE);
        }
        //设置一分钟内不允许发送第二次验证码
        String phoneCodeKey = getPhoneCodeKey(userDto.getPhone());
        Long expire = redisService.getExpire(phoneCodeKey, TimeUnit.SECONDS);
        if (expire != null && (phoneCodeExpiration * 60 - expire) < 60) {
            throw new ServiceException(ResultCode.FAILED_FREQUENT);
        }
        //对于每天的用户获取验证码获取次数有一个限制 50次 第二天 计数清0 重新开始   计数
        //操作这个次数数据频繁   、 不需要存储、  记录的次数 有有效时间的（当天有效） redis  String  key：c:t:手机号
        //获取已经请求的次数  和50 进行比较     如果大于限制抛出异常。如果不大于限制，正常执行后续逻辑，并且将获取计数 + 1
        String codeTimeKey = getCodeTimeKey(userDto.getPhone());
        Long sendTimes = redisService.getCacheObject(codeTimeKey, Long.class);
        if (sendTimes != null && sendTimes >= sendLimit) {
            throw new ServiceException(ResultCode.FAILED_TIME_LIMIT);
        }

        String code = RandomUtil.randomNumbers(6);
        //存储到redis 数据结构: String key:phone(手机号):code(验证码) 手机号 value :code,并设置有效时间为5分钟
        redisService.setCacheObject(phoneCodeKey, code, phoneCodeExpiration, TimeUnit.MINUTES);
        boolean sendMobileCode = aliSmsService.sendMobileCode(userDto.getPhone(), code);
        if(!sendMobileCode) {
            throw new ServiceException(ResultCode.FAILED_SEND_CODE);
        }
        redisService.increment(codeTimeKey);
        if (sendTimes == null) {//说明是当天第一次发起获取验证码的请求
            long seconds = ChronoUnit.SECONDS.between(LocalDateTime.now(),
                    LocalDateTime.now().plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0));
            redisService.expire(codeTimeKey, seconds, TimeUnit.SECONDS);
        }
        return true;
    }


    public static boolean checkPhone(String phone) {
        Pattern regex = Pattern.compile("^1[2|3|4|5|6|7|8|9][0-9]\\d{8}$");
        Matcher m = regex.matcher(phone);
        return m.matches();
    }

    private String getCodeTimeKey(String phone) {
        return CacheConstants.CODE_TIME_KEY + phone;
    }

    private String getPhoneCodeKey(String phone) {
        return CacheConstants.PHONE_CODE_KEY + phone;
    }
}
