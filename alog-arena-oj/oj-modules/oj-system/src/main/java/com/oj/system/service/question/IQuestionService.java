package com.oj.system.service.question;

import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionVO;

import java.util.List;

public interface IQuestionService {
    List<QuestionVO> list(QuestionQueryDto questionQueryDto);
}
