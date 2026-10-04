package com.oj.friend.manager;


import cn.hutool.core.bean.BeanUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.constants.CacheConstants;
import com.oj.friend.entity.user.UserInfo;
import com.oj.friend.entity.user.vo.UserVo;
import com.oj.friend.mapper.user.UserMapper;
import com.oj.redis.service.RedisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;


@Component
public class UserCacheManager {

    @Autowired
    private RedisService redisService;

    @Autowired
    private UserMapper userMapper;


    public UserVo getUserById(Long userId) {
        String userKey = getUserKey(userId);
        UserVo userVo = redisService.getCacheObject(userKey, UserVo.class);
        if (userVo != null) {
            //将缓存延迟10分钟
            redisService.expire(userKey,CacheConstants.USER_EXP, TimeUnit.MINUTES);
            return userVo;
        }
        UserInfo userInfo = userMapper.selectOne(new LambdaQueryWrapper<UserInfo>()
                .select(UserInfo::getUserId,
                        UserInfo::getNickName,
                        UserInfo::getHeadImage,
                        UserInfo::getSex,
                        UserInfo::getEmail,
                        UserInfo::getPhone,
                        UserInfo::getWechat,
                        UserInfo::getIntroduce,
                        UserInfo::getSchoolName,
                        UserInfo::getMajorName,
                        UserInfo::getStatus)
                .eq(UserInfo::getUserId,userId));
        if (userInfo == null) {
            return null;
        }
        refreshUser(userInfo);
        userVo = new UserVo();
        BeanUtil.copyProperties(userInfo,userVo);
        return userVo;
    }

    private void refreshUser(UserInfo userInfo) {
        //刷新用户缓存
        String userKey = getUserKey(userInfo.getUserId());
        redisService.setCacheObject(userKey, userInfo);
        //设置用户缓存有效期为10分钟
        redisService.expire(userKey, CacheConstants.USER_EXP, TimeUnit.MINUTES);
    }


    private String getUserKey(Long userId) {
        return CacheConstants.USER_DETAIL + userId;
    }
}
