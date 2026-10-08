package com.oj.friend.aspect;

import com.oj.common.constants.Constants;
import com.oj.common.enums.ResultCode;
import com.oj.friend.entity.user.vo.UserVo;
import com.oj.friend.manager.UserCacheManager;
import com.oj.security.expection.ServiceException;
import com.oj.security.utils.ThreadLocalUtil;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Objects;

@Aspect
@Component
public class UserStatusCheckAspect {


    @Autowired
    private UserCacheManager userCacheManager;

    @Before(value = "@annotation(com.oj.friend.aspect.CheckUserStatus)")
    public void before(JoinPoint point){
        Long userId = ThreadLocalUtil.get(Constants.USER_ID, Long.class);
        UserVo user = userCacheManager.getUserById(userId);
        if (user == null) {
            throw new ServiceException(ResultCode.FAILED_USER_NOT_EXISTS);
        }
        if (Objects.equals(user.getStatus(), Constants.FALSE)) {
            throw new ServiceException(ResultCode.FAILED_USER_BANNED);
        }
    }

}
