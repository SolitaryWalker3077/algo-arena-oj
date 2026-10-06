package com.oj.judge.service;

import com.oj.api.entity.dto.JudgeSubmitDto;
import com.oj.api.entity.vo.UserQuestionResultVo;

public interface IJudgeService {

    UserQuestionResultVo doJudgeJavaCode(JudgeSubmitDto judgeSubmitDTO);
}
