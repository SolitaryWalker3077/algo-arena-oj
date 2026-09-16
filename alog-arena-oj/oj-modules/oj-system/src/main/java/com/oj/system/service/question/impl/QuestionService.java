package com.oj.system.service.question.impl;


import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.github.pagehelper.PageHelper;
import com.oj.common.enums.ResultCode;
import com.oj.security.expection.ServiceException;
import com.oj.system.entity.question.Questions;
import com.oj.system.entity.question.dto.QuestionAddDto;
import com.oj.system.entity.question.dto.QuestionEditDto;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionDetailVO;
import com.oj.system.entity.question.vo.QuestionVO;
import com.oj.system.mapper.question.QuestionMapper;
import com.oj.system.service.question.IQuestionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
public class QuestionService implements IQuestionService {

    @Autowired
    private QuestionMapper questionMapper;

    @Override
    public List<QuestionVO> list(QuestionQueryDto questionQueryDto) {
        PageHelper.startPage(questionQueryDto.getPageNum(),questionQueryDto.getPageSize());
        return questionMapper.selectQuestionList(questionQueryDto);
    }


    @Override
    public int add(QuestionAddDto questionAddDto) {
        List<Questions> questionsList = questionMapper.selectList(new LambdaQueryWrapper<Questions>()
                .eq(Questions::getTitle, questionAddDto.getTitle()));

        if (CollectionUtil.isNotEmpty(questionsList)) {
            throw new ServiceException(ResultCode.FAILED_ALREADY_EXISTS);
        }
        Questions questions  =new Questions();
        //将questionAddDto对象转换为questions对象
        //可以使用hutool工具包当中的BeanUtil.copyProperties方法
        BeanUtil.copyProperties(questionAddDto,questions);
        return questionMapper.insert(questions);
    }


    @Override
    public QuestionDetailVO detail(Long questionId) {
        Questions question = questionMapper.selectById(questionId);
        if(question == null) {
            throw new ServiceException(ResultCode.FAILED_NOT_EXISTS);
        }
        QuestionDetailVO questionDetailVO = new QuestionDetailVO();
        BeanUtil.copyProperties(question,questionDetailVO);
        return questionDetailVO;
    }


    @Override
    public int edit(QuestionEditDto questionEditDto) {
        Questions oldQuestion = questionMapper.selectById(questionEditDto.getQuestionId());
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
        return questionMapper.updateById(oldQuestion);
    }

    @Override
    public int delete(Long questionId) {
        Questions question = questionMapper.selectById(questionId);
        if (question == null) {
            throw new ServiceException(ResultCode.FAILED_NOT_EXISTS);
        }
        return questionMapper.deleteById(questionId);
    }
}
