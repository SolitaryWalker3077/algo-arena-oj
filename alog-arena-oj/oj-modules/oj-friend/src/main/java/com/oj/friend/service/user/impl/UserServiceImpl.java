package com.oj.friend.service.user.impl;

import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.constants.CacheConstants;
import com.oj.common.constants.Constants;
import com.oj.common.constants.HttpConstants;
import com.oj.common.entity.LoginUser;
import com.oj.common.entity.Result;
import com.oj.common.entity.vo.LoginUserVO;
import com.oj.common.enums.ResultCode;
import com.oj.common.enums.UserIdentify;
import com.oj.common.enums.UserStatus;
import com.oj.friend.entity.user.UserInfo;
import com.oj.friend.entity.user.dto.UserDto;
import com.oj.friend.entity.user.dto.UserUpdateDto;
import com.oj.friend.entity.user.vo.UserVo;
import com.oj.friend.manager.UserCacheManager;
import com.oj.friend.mapper.user.UserMapper;
import com.oj.friend.service.user.IUserService;
import com.oj.message.service.AliSmsService;
import com.oj.redis.service.RedisService;
import com.oj.security.expection.ServiceException;
import com.oj.security.service.TokenService;
import com.oj.security.utils.ThreadLocalUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class UserServiceImpl implements IUserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private AliSmsService aliSmsService;

    @Autowired
    private RedisService redisService;

    @Autowired
    private UserCacheManager userCacheManager;

    @Value("${sms.code-expiration: 5}")
    private Long phoneCodeExpiration;

    @Value("${sms.send-limit:3}")
    private Integer sendLimit;

    @Value("${sms.is-send:false}")
    private boolean isSend;  //开关打开：true 生成随机验证码，生产环境使用  开关关闭false 生成固定的，测试环境使用

    @Value("${jwt.secret}")
    private String secret;

//    @Value("${file.oss.downloadUrl}")
//    private String downloadUrl;

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

        String code = isSend ? RandomUtil.randomNumbers(6) : Constants.DEFAULT_CODE;
        //存储到redis 数据结构: String key:phone(手机号):code(验证码) 手机号 value :code,并设置有效时间为5分钟
        redisService.setCacheObject(phoneCodeKey, code, phoneCodeExpiration, TimeUnit.MINUTES);
        if(isSend) {
            boolean sendMobileCode = aliSmsService.sendMobileCode(userDto.getPhone(), code);
            if (!sendMobileCode) {
                throw new ServiceException(ResultCode.FAILED_SEND_CODE);
            }
        }
        redisService.increment(codeTimeKey);
        if (sendTimes == null) {//说明是当天第一次发起获取验证码的请求
            long seconds = ChronoUnit.SECONDS.between(LocalDateTime.now(),
                    LocalDateTime.now().plusDays(1).withHour(0).withMinute(0).withSecond(0).withNano(0));
            redisService.expire(codeTimeKey, seconds, TimeUnit.SECONDS);
        }
        return true;
    }

    @Override
    public String codeLogin(String phone, String code) {
        checkCode(phone, code);
        UserInfo user = userMapper.selectOne(new LambdaQueryWrapper<UserInfo>().eq(UserInfo::getPhone, phone));
        if(user == null) {
            //注册逻辑
            user = new UserInfo();
            user.setPhone(phone);
            user.setStatus(UserStatus.Normal.getValue());
            userMapper.insert(user);
        }
        return tokenService.createToken(user.getUserId(),
                secret, UserIdentify.ORDINARY.getValue(), user.getNickName(),user.getHeadImage());

    }

    @Override
    public boolean logout(String token) {
        if (StrUtil.isNotEmpty(token) && token.startsWith(HttpConstants.PREFIX)) {
            token = token.replaceFirst(HttpConstants.PREFIX, StrUtil.EMPTY);
        }
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
        loginUserVO.setHeadImage(loginUser.getHeadImage());
        return Result.success(loginUserVO) ;
    }

    @Override
    public UserVo detail() {
        Long userId = ThreadLocalUtil.get(Constants.USER_ID, Long.class);
        if(userId == null) {
            throw new ServiceException(ResultCode.FAILED_USER_NOT_EXISTS);
        }
        UserVo userVo = userCacheManager.getUserById(userId);
        if(userVo == null) {
            throw new ServiceException(ResultCode.FAILED_USER_NOT_EXISTS);
        }
//        if(StrUtil.isNotEmpty(userVo.getHeadImage())) {
//            userVo.setHeadImage(downloadUrl+userVo.getHeadImage());
//        }
        return userVo;
    }

    @Override
    public int edit(UserUpdateDto userUpdateDto) {
        Long userId = ThreadLocalUtil.get(Constants.USER_ID, Long.class);
        if (userId == null) {
            throw new ServiceException(ResultCode.FAILED_USER_NOT_EXISTS);
        }
        UserInfo userInfo = userMapper.selectById(userId);
        if (userInfo == null) {
            throw new ServiceException(ResultCode.FAILED_USER_NOT_EXISTS);
        }
        userInfo.setNickName(userUpdateDto.getNickName());
        userInfo.setSex(userUpdateDto.getSex());
        userInfo.setSchoolName(userUpdateDto.getSchoolName());
        userInfo.setMajorName(userUpdateDto.getMajorName());
        userInfo.setPhone(userUpdateDto.getPhone());
        userInfo.setEmail(userUpdateDto.getEmail());
        userInfo.setWechat(userUpdateDto.getWechat());
        userInfo.setIntroduce(userUpdateDto.getIntroduce());
        //更新用户缓存
        userCacheManager.refreshUser(userInfo);
        tokenService.refreshLoginUser(userInfo.getNickName(),userInfo.getHeadImage(),
                ThreadLocalUtil.get(Constants.USER_KEY, String.class));
        return userMapper.updateById(userInfo);
    }

    private void checkCode(String phone, String code) {
        String phoneCodeKey = getPhoneCodeKey(phone);
        String cacheCode = redisService.getCacheObject(phoneCodeKey, String.class);
        if (StrUtil.isEmpty(cacheCode)) { //验证码无效
            throw new ServiceException(ResultCode.FAILED_INVALID_CODE);
        }
        if (!cacheCode.equals(code)) { //验证码错误
            throw new ServiceException(ResultCode.FAILED_ERROR_CODE);
        }
        //验证码比对成功
        redisService.deleteObject(phoneCodeKey);
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
