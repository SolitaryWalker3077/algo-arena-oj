package com.oj.system.service.question;

import com.oj.system.entity.question.dto.QuestionAddDto;
import com.oj.system.entity.question.dto.QuestionEditDto;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionDetailVo;
import com.oj.system.entity.question.vo.QuestionVo;

import java.util.List;

public interface IQuestionService {
    List<QuestionVo> list(QuestionQueryDto questionQueryDto);

    int add(QuestionAddDto questionAddDto);

    QuestionDetailVo detail(Long questionId);

    int edit(QuestionEditDto questionEditDto);

    int delete(Long questionId);
}
