package com.oj.system.service.exam.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.github.pagehelper.PageHelper;
import com.oj.common.enums.ResultCode;
import com.oj.security.expection.ServiceException;
import com.oj.system.entity.exam.ExamInfo;
import com.oj.system.entity.exam.ExamQuestionInfo;
import com.oj.system.entity.exam.dto.ExamAddDto;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.dto.ExamQuestionAddDto;
import com.oj.system.entity.exam.vo.ExamDetailVO;
import com.oj.system.entity.exam.vo.ExamVO;
import com.oj.system.entity.question.QuestionsInfo;
import com.oj.system.entity.question.vo.QuestionVO;
import com.oj.system.mapper.exam.ExamMapper;
import com.oj.system.mapper.exam.ExamQuestionMapper;
import com.oj.system.mapper.question.QuestionMapper;
import com.oj.system.service.exam.IExamService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class ExamService extends ServiceImpl<ExamQuestionMapper,ExamQuestionInfo> implements IExamService {

    @Autowired
    private ExamMapper examMapper;

    @Autowired
    private QuestionMapper questionMapper;

    @Autowired
    private ExamQuestionMapper examQuestionMapper;

    @Override
    public List<ExamVO> list(ExamQueryDto examQueryDto) {
        PageHelper.startPage(examQueryDto.getPageNum(), examQueryDto.getPageSize());
        return examMapper.selectExamList(examQueryDto);
    }

    @Override
    public int add(ExamAddDto examAddDto) {
        List<ExamInfo> examInfos = examMapper.selectList(new LambdaQueryWrapper<ExamInfo>()
                .eq(ExamInfo::getTitle, examAddDto.getTitle()));

        if (CollectionUtil.isNotEmpty(examInfos)) {
            throw new ServiceException(ResultCode.FAILED_ALREADY_EXISTS);
        }
        if (examAddDto.getStartTime().isBefore(LocalDateTime.now())) {
            throw new ServiceException(ResultCode.EXAM_START_TIME_BEFORE_CURRENT_TIME);
        }

        if (examAddDto.getStartTime().isAfter(examAddDto.getEndTime())) {
            throw new ServiceException(ResultCode.EXAM_START_TIME_AFTER_END_TIME);
        }

        ExamInfo exam = new ExamInfo();
        BeanUtil.copyProperties(examAddDto, exam);
        return examMapper.insert(exam);
    }

    @Override
    public boolean questionAdd(ExamQuestionAddDto examQuestionAddDto) {
        ExamInfo examInfo = getExamInfo(examQuestionAddDto.getExamId());
        Set<Long> questionIdSet = examQuestionAddDto.getQuestionIdSet();
        if (CollectionUtil.isEmpty(questionIdSet)) {
            //一条题目不添加
            return true;
        }
        //根据题目id查询题目放入列表当中
        List<QuestionsInfo> questionsInfoList = questionMapper.selectBatchIds(questionIdSet);
        if (CollectionUtil.isEmpty(questionsInfoList) || questionsInfoList.size() < questionIdSet.size()) {
            //竞赛题目不存在
            throw new ServiceException(ResultCode.EXAM_QUESTION_NOT_EXISTS);
        }
        return saveExamQuestion(questionIdSet, examInfo);
    }

    @Override
    public ExamDetailVO detail(Long examId) {
        ExamDetailVO examDetailVO = new ExamDetailVO();
        ExamInfo examInfo = getExamInfo(examId);
        BeanUtil.copyProperties(examInfo,examDetailVO );

        List<ExamQuestionInfo> examQuestionInfoList = examQuestionMapper.selectList(new LambdaQueryWrapper<ExamQuestionInfo>()
                .select(ExamQuestionInfo::getQuestionId)
                .eq(ExamQuestionInfo::getExamId, examId)
                .orderByAsc(ExamQuestionInfo::getQuestionOrder));
        if (CollectionUtil.isEmpty(examQuestionInfoList)) {
            //返回详情 只包含竞赛的基本信息
            return examDetailVO;
        }
        List<Long> qustionIdList = examQuestionInfoList.stream().map(ExamQuestionInfo::getQuestionId).toList();
        List<QuestionsInfo> questionsInfoList = questionMapper.selectList(new LambdaQueryWrapper<QuestionsInfo>()
                .select(QuestionsInfo::getQuestionId, QuestionsInfo::getTitle, QuestionsInfo::getDifficult)
                .in(QuestionsInfo::getQuestionId, qustionIdList));
        //List<QuestionVO> questionVOList = new ArrayList<>();
        List<QuestionVO> questionVOList = BeanUtil.copyToList(questionsInfoList, QuestionVO.class);
        examDetailVO.setExamQuestionList(questionVOList);
        return examDetailVO;
    }



    private boolean saveExamQuestion(Set<Long> questionIdSet, ExamInfo examInfo) {
        int num = 1;
        List<ExamQuestionInfo> examQuestionInfoList = new ArrayList<>();
        for (Long questionId : questionIdSet) {
            ExamQuestionInfo examQuestionInfo = new ExamQuestionInfo();
            examQuestionInfo.setExamId(examInfo.getExamId());
            examQuestionInfo.setQuestionId(questionId);
            examQuestionInfo.setQuestionOrder(num++);
            examQuestionInfoList.add(examQuestionInfo);
        }
        return saveBatch(examQuestionInfoList);
    }

    private ExamInfo getExamInfo(Long examId) {
        ExamInfo examInfo = examMapper.selectById(examId);
        if (examInfo == null) {
            throw new ServiceException(ResultCode.EXAM_NOT_EXISTS );
        }
        return examInfo;
    }



}
