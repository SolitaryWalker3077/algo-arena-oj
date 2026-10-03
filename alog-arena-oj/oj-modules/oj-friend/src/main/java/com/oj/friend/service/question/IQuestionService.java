package com.oj.friend.service.question;

import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.question.dto.QuestionQueryDto;

public interface IQuestionService {
    TableDataInfo list(QuestionQueryDto questionQueryDto);
}
