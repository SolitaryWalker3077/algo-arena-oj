package com.oj.api;

import com.oj.common.constants.Constants;
import com.oj.common.entity.Result;
import com.oj.api.entity.dto.JudgeSubmitDto;
import com.oj.api.entity.vo.UserQuestionResultVo;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(contextId = "com.oj.api.RemoteJudgeService", value = Constants.JUDGE_SERVICE)
public interface RemoteJudgeService {
    @PostMapping("/judge/doJudgeJavaCode")
    abstract Result<UserQuestionResultVo> doJudgeJavaCode(@RequestBody JudgeSubmitDto judgeSubmitDTO);
}
