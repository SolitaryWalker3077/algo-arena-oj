package com.oj.system.service.question.impl;


import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.github.pagehelper.PageHelper;
import com.oj.common.enums.ResultCode;
import com.oj.security.expection.ServiceException;
import com.oj.system.elasticsearch.QuestionRepository;
import com.oj.system.entity.es.QuestionEs;
import com.oj.system.entity.question.QuestionsInfo;
import com.oj.system.entity.question.dto.QuestionAddDto;
import com.oj.system.entity.question.dto.QuestionEditDto;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionDetailVo;
import com.oj.system.entity.question.vo.QuestionVo;
import com.oj.system.mapper.question.QuestionMapper;
import com.oj.system.service.question.IQuestionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class QuestionServiceImpl implements IQuestionService {

    @Autowired
    private QuestionMapper questionMapper;

    @Autowired
    private QuestionRepository questionRepository;


    @Override
    public List<QuestionVo> list(QuestionQueryDto questionQueryDto) {
        PageHelper.startPage(questionQueryDto.getPageNum(),questionQueryDto.getPageSize());
        return questionMapper.selectQuestionList(questionQueryDto);
    }


    @Override
    public boolean add(QuestionAddDto questionAddDto) {
        List<QuestionsInfo> questionsInfoList = questionMapper.selectList(new LambdaQueryWrapper<QuestionsInfo>()
                .eq(QuestionsInfo::getTitle, questionAddDto.getTitle()));

        if (CollectionUtil.isNotEmpty(questionsInfoList)) {
            throw new ServiceException(ResultCode.FAILED_ALREADY_EXISTS);
        }
        QuestionsInfo questionsInfo =new QuestionsInfo();
        //将questionAddDto对象转换为questions对象
        //可以使用hutool工具包当中的BeanUtil.copyProperties方法
        BeanUtil.copyProperties(questionAddDto, questionsInfo);
        int insert = questionMapper.insert(questionsInfo);
        if(insert <= 0) {
            return false;
        }
        QuestionEs questionEs = new QuestionEs();
        BeanUtil.copyProperties(questionsInfo,questionEs);
        questionRepository.save(questionEs);
        return true;
    }


    @Override
    public QuestionDetailVo detail(Long questionId) {
        QuestionsInfo question = questionMapper.selectById(questionId);
        if(question == null) {
            throw new ServiceException(ResultCode.FAILED_NOT_EXISTS);
        }
        QuestionDetailVo questionDetailVO = new QuestionDetailVo();
        BeanUtil.copyProperties(question,questionDetailVO);
        return questionDetailVO;
    }


    @Override
    public int edit(QuestionEditDto questionEditDto) {
        QuestionsInfo oldQuestion = questionMapper.selectById(questionEditDto.getQuestionId());
        if (oldQuestion == null) {
            throw new ServiceException(ResultCode.FAILED_NOT_EXISTS);
        }

        oldQuestion.setTitle(questionEditDto.getTitle());
        oldQuestion.setDifficult(questionEditDto.getDifficult());
        oldQuestion.setTimeLimit(questionEditDto.getTimeLimit());
        oldQuestion.setSpaceLimit(questionEditDto.getSpaceLimit());
        oldQuestion.setContent(questionEditDto.getContent());
        oldQuestion.setQuestionCase(questionEditDto.getQuestionCase());
        oldQuestion.setDefaultCode(questionEditDto.getDefaultCode());
        oldQuestion.setMainFac(questionEditDto.getMainFac());
        QuestionEs questionEs = new QuestionEs();
        BeanUtil.copyProperties(oldQuestion,questionEs);
        questionRepository.save(questionEs);
        return questionMapper.updateById(oldQuestion);
    }

    @Override
    public int delete(Long questionId) {
        QuestionsInfo question = questionMapper.selectById(questionId);
        if (question == null) {
            throw new ServiceException(ResultCode.FAILED_NOT_EXISTS);
        }
        questionRepository.deleteById(questionId);
        return questionMapper.deleteById(questionId);
    }
}
