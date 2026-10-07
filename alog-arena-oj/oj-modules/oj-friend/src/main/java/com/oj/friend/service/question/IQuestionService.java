package com.oj.friend.service.question;

import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.question.dto.QuestionQueryDto;
import com.oj.friend.entity.question.vo.QuestionDetailVo;
import com.oj.friend.entity.question.vo.QuestionVo;

import java.util.List;

public interface IQuestionService {
    TableDataInfo list(QuestionQueryDto questionQueryDto);

    List<QuestionVo> hotList();

    QuestionDetailVo detail(Long questionId);

    String preQuestion(Long questionId);

    String nextQuestion(Long questionId);


}
