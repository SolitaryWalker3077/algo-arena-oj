package com.oj.friend.service.user.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.oj.common.constants.Constants;
import com.oj.common.entity.TableDataInfo;
import com.oj.common.enums.ExamListType;
import com.oj.common.enums.ResultCode;
import com.oj.friend.entity.exam.ExamInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.entity.user.UserExamInfo;
import com.oj.friend.manager.ExamCacheManager;
import com.oj.friend.manager.UserCacheManager;
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
import java.util.List;

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

    private UserCacheManager userCacheManager;

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
        userExamInfo = new UserExamInfo();
        userExamInfo.setExamId(examId);
        userExamInfo.setUserId(userId);
        int inserted = userExamMapper.insert(userExamInfo);
        if (inserted > 0) {
            examCacheManager.addUserExamCache(userId, examId);
        }
        return inserted;
    }

    //先查缓存(u:e:l:用户id) 如果缓存能够查询到
    //如果查询不到,就去数据库当中去查询,并且将数据库中的数据同步给redis缓存
    @Override
    public TableDataInfo list(ExamQueryDto examQueryDto) {
        //从redis当中获取 竞赛列表的数据
        Long userId = ThreadLocalUtil.get(Constants.USER_ID, Long.class);
        examQueryDto.setType(ExamListType.USER_EXAM_LIST.getValue());
        Long total = examCacheManager.getListSize(ExamListType.USER_EXAM_LIST.getValue(),userId);
        List<ExamVo> examVoList;
        if (total == null || total <= 0) {
            //从数据库中查询我的竞赛列表
            PageHelper.startPage(examQueryDto.getPageNum(),examQueryDto.getPageSize());
            examVoList = userExamMapper.selectUserExamList(userId);
            examCacheManager.refreshCache(ExamListType.USER_EXAM_LIST.getValue(),userId);
            total = new PageInfo<>(examVoList).getTotal();
        } else {
            examVoList = examCacheManager.getExamVOList(examQueryDto,userId);
            total = examCacheManager.getListSize(examQueryDto.getType(),userId);
        }
        if (CollectionUtil.isEmpty(examVoList)) {
            return TableDataInfo.empty();
        }
        return TableDataInfo.success(examVoList,total);
    }
}
