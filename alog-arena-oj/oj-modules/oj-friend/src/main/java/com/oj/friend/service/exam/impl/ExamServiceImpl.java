package com.oj.friend.service.exam.impl;

import cn.hutool.core.collection.CollectionUtil;
import com.github.pagehelper.PageHelper;
import com.github.pagehelper.PageInfo;
import com.oj.common.constants.Constants;
import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;
import com.oj.friend.entity.exam.dto.ExamRankDto;
import com.oj.friend.entity.exam.vo.ExamRankVo;
import com.oj.friend.entity.exam.vo.ExamVo;
import com.oj.friend.entity.user.vo.UserVo;
import com.oj.friend.manager.ExamCacheManager;
import com.oj.friend.manager.UserCacheManager;
import com.oj.friend.mapper.exam.ExamMapper;
import com.oj.friend.mapper.user.UserExamMapper;
import com.oj.friend.service.exam.IExamService;
import com.oj.security.utils.ThreadLocalUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


import java.util.Collection;
import java.util.List;

@Service
public class ExamServiceImpl implements IExamService {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private UserExamMapper userExamMapper;

    @Autowired
    private ExamCacheManager examCacheManager;

    @Autowired
    private UserCacheManager userCacheManager;


    @Override
    public List<ExamVo> list(ExamQueryDto examQueryDto) {
        PageHelper.startPage(examQueryDto.getPageNum(), examQueryDto.getPageSize());
        return examMapper.selectExamList(examQueryDto);
    }

    @Override
    public TableDataInfo redisList(ExamQueryDto examQueryDto) {
        //从redis当中获取 竞赛列表的数据
        Long total = examCacheManager.getListSize(examQueryDto.getType(),null);
        List<ExamVo> examVoList;
        if (total == null || total <= 0) {
            examVoList = list(examQueryDto);
            examCacheManager.refreshCache(examQueryDto.getType(),null);
            total = new PageInfo<>(examVoList).getTotal();
        } else {
            examVoList = examCacheManager.getExamVOList(examQueryDto,null);
            total = examCacheManager.getListSize(examQueryDto.getType(),null);
        }
        if (CollectionUtil.isEmpty(examVoList)) {
            return TableDataInfo.empty();
        }
        assembleExamVoList(examVoList);
        return TableDataInfo.success(examVoList,total);
    }

    @Override
    public TableDataInfo rankList(ExamRankDto examRankDto) {
        Long total = examCacheManager.getRankListSize(examRankDto.getExamId());
        List<ExamRankVo> examRankVOList;
        if (total == null || total <= 0) {
            PageHelper.startPage(examRankDto.getPageNum(), examRankDto.getPageSize());
            examRankVOList = userExamMapper.selectExamRankList(examRankDto.getExamId());
            examCacheManager.refreshExamRankCache(examRankDto.getExamId());
            total = new PageInfo<>(examRankVOList).getTotal();
        } else {
            examRankVOList = examCacheManager.getExamRankList(examRankDto);
        }
        if (CollectionUtil.isEmpty(examRankVOList)) {
            return TableDataInfo.empty();
        }
        assembleExamRankVOList(examRankVOList);
        return TableDataInfo.success(examRankVOList, total);
    }

    @Override
    public String getFirstQuestion(Long examId) {
        checkAndRefresh(examId);
        return examCacheManager.getFirstQuestion(examId).toString();
    }



    @Override
    public String preQuestion(Long examId, Long questionId) {
        checkAndRefresh(examId);
        return examCacheManager.getPreQuestion(examId,questionId).toString();
    }

    @Override
    public String nextQuestion(Long examId, Long questionId) {
        checkAndRefresh(examId);
        return examCacheManager.getNextQuestion(examId,questionId).toString();
    }



    private void assembleExamVoList(List<ExamVo> examVoList) {
        Long userId = ThreadLocalUtil.get(Constants.USER_ID, Long.class);
        List<Long> userExamIdList = examCacheManager.getAllUserExamList(userId);
        if (CollectionUtil.isEmpty(userExamIdList)) {
            return;
        }
        for (ExamVo examVo : examVoList) {
            if (userExamIdList.contains(examVo.getExamId())) {
                examVo.setEnter(true);
            }
        }
    }

    private void assembleExamRankVOList(List<ExamRankVo> examRankVOList) {
        if (CollectionUtil.isEmpty(examRankVOList)) {
            return;
        }
        for (ExamRankVo examRankVO : examRankVOList) {
            Long userId = examRankVO.getUserId();
            UserVo user = userCacheManager.getUserById(userId);
            examRankVO.setNickName(user.getNickName());
        }
    }

    private void checkAndRefresh(Long examId) {
        Long listSize = examCacheManager.getExamQuestionListSize(examId);
        if(listSize == null || listSize <= 0) {
            examCacheManager.refreshExamQuestionCache(examId);
        }
    }
}
