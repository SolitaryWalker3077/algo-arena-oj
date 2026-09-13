package com.oj.system.mapper.question;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.system.entity.question.Questions;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionVO;

import java.util.List;

public interface QuestionMapper extends BaseMapper<Questions> {

    List<QuestionVO> selectQuestionList(QuestionQueryDto questionQueryDto);
}
