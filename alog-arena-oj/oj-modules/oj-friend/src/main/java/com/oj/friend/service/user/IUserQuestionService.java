package com.oj.friend.service.user;

import com.oj.common.entity.Result;
import com.oj.friend.entity.user.dto.UserSubmitDto;
import com.oj.api.entity.vo.UserQuestionResultVo;


public interface IUserQuestionService {
    Result<UserQuestionResultVo> submit(UserSubmitDto userSubmitDto);

    boolean rabbitSubmit(UserSubmitDto submitDto);

    UserQuestionResultVo exeResult(Long examId, Long questionId, String currentTime);
}
