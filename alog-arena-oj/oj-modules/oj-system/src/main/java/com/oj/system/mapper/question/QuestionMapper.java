package com.oj.system.mapper.question;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.system.entity.question.QuestionsInfo;
import com.oj.system.entity.question.dto.QuestionQueryDto;
import com.oj.system.entity.question.vo.QuestionVO;

import java.util.List;

public interface QuestionMapper extends BaseMapper<QuestionsInfo> {

    List<QuestionVO> selectQuestionList(QuestionQueryDto questionQueryDto);
}
