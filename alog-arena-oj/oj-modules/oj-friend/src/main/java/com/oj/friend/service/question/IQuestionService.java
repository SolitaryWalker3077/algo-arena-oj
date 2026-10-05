package com.oj.friend.service.question;

import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.question.dto.QuestionQueryDto;
import com.oj.friend.entity.question.vo.QuestionDetailVo;

public interface IQuestionService {
    TableDataInfo list(QuestionQueryDto questionQueryDto);

    QuestionDetailVo detail(Long questionId);

    String preQuestion(Long questionId);

    String nextQuestion(Long questionId);
}
