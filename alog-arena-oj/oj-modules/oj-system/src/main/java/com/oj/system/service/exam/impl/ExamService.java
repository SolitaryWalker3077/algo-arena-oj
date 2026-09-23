package com.oj.system.service.exam.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.github.pagehelper.PageHelper;
import com.oj.common.constants.Constants;
import com.oj.common.enums.ResultCode;
import com.oj.security.expection.ServiceException;
import com.oj.system.entity.exam.ExamInfo;
import com.oj.system.entity.exam.ExamQuestionInfo;
import com.oj.system.entity.exam.dto.ExamAddDto;
import com.oj.system.entity.exam.dto.ExamEditDto;
import com.oj.system.entity.exam.dto.ExamQueryDto;
import com.oj.system.entity.exam.dto.ExamQuestionAddDto;
import com.oj.system.entity.exam.vo.ExamDetailVo;
import com.oj.system.entity.exam.vo.ExamVo;
import com.oj.system.entity.question.QuestionsInfo;
import com.oj.system.entity.question.vo.QuestionVo;
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
    public List<ExamVo> list(ExamQueryDto examQueryDto) {
        PageHelper.startPage(examQueryDto.getPageNum(), examQueryDto.getPageSize());
        return examMapper.selectExamList(examQueryDto);
    }

    @Override
    public String add(ExamAddDto examAddDto) {
        checkExamParams(examAddDto,null);

        ExamInfo exam = new ExamInfo();
        BeanUtil.copyProperties(examAddDto, exam);
        examMapper.insert(exam);
        return exam.getExamId().toString();
    }



    @Override
    public boolean questionAdd(ExamQuestionAddDto examQuestionAddDto) {
        ExamInfo examInfo = getExamInfo(examQuestionAddDto.getExamId());
        checkExamNotStarted(examInfo);
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
    public int questionDelete(Long examId, Long questionId) {
        ExamInfo examInfo = getExamInfo(examId);
        checkExamNotStarted(examInfo);

        return examQuestionMapper.delete(new LambdaQueryWrapper<ExamQuestionInfo>()
                .eq(ExamQuestionInfo::getExamId,examId).eq(ExamQuestionInfo::getQuestionId,questionId));
    }

    @Override
    public ExamDetailVo detail(Long examId) {
        ExamDetailVo examDetailVO = new ExamDetailVo();
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
        List<QuestionVo> questionVoList = BeanUtil.copyToList(questionsInfoList, QuestionVo.class);
        examDetailVO.setExamQuestionList(questionVoList);
        return examDetailVO;
    }


    @Override
    public int  edit(ExamEditDto examEditDto) {
        ExamInfo examInfo = getExamInfo(examEditDto.getExamId());
        checkExamNotStarted(examInfo);
        checkExamParams(examEditDto,examEditDto.getExamId());

        examInfo.setTitle(examEditDto.getTitle());
        examInfo.setStartTime(examEditDto.getStartTime());
        examInfo.setEndTime(examEditDto.getEndTime());
        return examMapper.updateById(examInfo);
    }

    @Override
    public int delete(Long examId) {
        ExamInfo examInfo = getExamInfo(examId);
        checkExamNotStarted(examInfo);
        examQuestionMapper.delete(new LambdaQueryWrapper<ExamQuestionInfo>()
                .eq(ExamQuestionInfo::getExamId,examId));
        return examMapper.deleteById(examInfo);
    }

    @Override
    public int publish(Long examId) {
        ExamInfo examInfo = getExamInfo(examId);
        Long count = examQuestionMapper.selectCount(new LambdaQueryWrapper<ExamQuestionInfo>().eq(ExamQuestionInfo::getExamId, examId));
        if(count == null || count <= 0) {
            throw new ServiceException(ResultCode.EXAM_QUESTION_NOT_EXISTS);
        }
        examInfo.setStatus(Constants.TRUE);
        return examMapper.updateById(examInfo);
    }

    @Override
    public int cancelPublish(Long examId) {
        ExamInfo examInfo = getExamInfo(examId);
        checkExamNotStarted(examInfo);
        examInfo.setStatus(Constants.FALSE);
        return examMapper.updateById(examInfo);
    }

    private void checkExamParams(ExamAddDto examSaveDto , Long examId) {
        List<ExamInfo> examInfos = examMapper
                .selectList(new LambdaQueryWrapper<ExamInfo>()
                .eq(ExamInfo::getTitle, examSaveDto.getTitle())
                .ne(examId != null,ExamInfo::getExamId,examId));

        if (CollectionUtil.isNotEmpty(examInfos)) {
            throw new ServiceException(ResultCode.FAILED_ALREADY_EXISTS);
        }
        if (examSaveDto.getStartTime().isBefore(LocalDateTime.now())) {
            throw new ServiceException(ResultCode.EXAM_START_TIME_BEFORE_CURRENT_TIME);
        }

        if (examSaveDto.getStartTime().isAfter(examSaveDto.getEndTime())) {
            throw new ServiceException(ResultCode.EXAM_START_TIME_AFTER_END_TIME);
        }
    }

    /**
     * 判断竞赛是否开赛
     * @param examInfo
     * */
    private void checkExamNotStarted(ExamInfo examInfo) {
        if (examInfo.getStartTime() != null && !LocalDateTime.now().isBefore(examInfo.getStartTime())) {
            throw new ServiceException(ResultCode.EXAM_STARTED);
        }
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

    /**
     * 根据竞赛id查询竞赛的信息
     * @param  examId
     * @return 竞赛详情信息
     *
     ** */
    private ExamInfo getExamInfo(Long examId) {
        ExamInfo examInfo = examMapper.selectById(examId);
        if (examInfo == null) {
            throw new ServiceException(ResultCode.EXAM_NOT_EXISTS );
        }
        return examInfo;
    }
}
