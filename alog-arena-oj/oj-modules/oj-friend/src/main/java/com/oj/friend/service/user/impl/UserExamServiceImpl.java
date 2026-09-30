package com.oj.friend.service.user.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.constants.Constants;
import com.oj.common.enums.ResultCode;
import com.oj.friend.entity.exam.ExamInfo;
import com.oj.friend.entity.user.UserExamInfo;
import com.oj.friend.manager.ExamCacheManager;
import com.oj.friend.mapper.exam.ExamMapper;
import com.oj.friend.mapper.user.UserExamMapper;
import com.oj.friend.service.user.IUserExamService;
import com.oj.security.expection.ServiceException;
import com.oj.security.service.TokenService;
import com.oj.security.utils.ThreadLocalUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class UserExamServiceImpl implements IUserExamService {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private UserExamMapper userExamMapper;

    @Autowired
    private TokenService tokenService;

    @Autowired
    private ExamCacheManager examCacheManager;

    @Value("${jwt.secret}")
    private String secret;

    @Override
    public int enter(String token, Long examId) {
        ExamInfo examInfo = examMapper.selectById(examId);
        if(examInfo == null) {
            //判断竞赛是否存在
            throw new ServiceException(ResultCode.FAILED_NOT_EXISTS);
        }
        if(examInfo.getStartTime().isBefore(LocalDateTime.now())) {
            //已经开始不允许报名
            throw new ServiceException(ResultCode.EXAM_STARTED);
        }
        //Long userId = tokenService.getUserId(token, secret);
        Long userId = ThreadLocalUtil.get(Constants.USER_ID, Long.class);
        UserExamInfo userExamInfo = userExamMapper.selectOne(new LambdaQueryWrapper<UserExamInfo>()
                .eq(UserExamInfo::getExamId, examId)
                .eq(UserExamInfo::getUserId, userId));
        if(userExamInfo != null) {
            throw new ServiceException(ResultCode.USER_EXAM_HAS_ENTER);
        }
        examCacheManager.addUserExamCache(userId,examId);
        userExamInfo = new UserExamInfo();
        userExamInfo.setExamId(examId);
        userExamInfo.setUserId(userId);
        return userExamMapper.insert(userExamInfo);
    }
}
