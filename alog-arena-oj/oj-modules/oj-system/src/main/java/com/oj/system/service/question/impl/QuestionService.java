package com.oj.system.service.question.impl;


import com.github.pagehelper.PageHelper;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionVO;
import com.oj.system.mapper.question.QuestionMapper;
import com.oj.system.service.question.IQuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QuestionService implements IQuestionService {

    @Autowired
    private QuestionMapper questionMapper;

    @Override
    public List<QuestionVO> list(QuestionQueryDto questionQueryDto) {
        PageHelper.startPage(questionQueryDto.getPageNum(),questionQueryDto.getPageSize());
        return questionMapper.selectQuestionList(questionQueryDto);
    }
}
