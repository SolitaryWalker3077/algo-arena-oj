package com.oj.system.service.question;

import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.question.dto.QuestionAddDto;
import com.oj.system.entity.question.dto.QuestionEditDto;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionDetailVO;
import com.oj.system.entity.question.vo.QuestionVO;

import java.util.List;

public interface IQuestionService {
    List<QuestionVO> list(QuestionQueryDto questionQueryDto);

    int add(QuestionAddDto questionAddDto);

    QuestionDetailVO detail(Long questionId);

    int edit(QuestionEditDto questionEditDto);

    int delete(Long questionId);
}
