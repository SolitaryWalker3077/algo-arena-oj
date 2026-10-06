package com.oj.judge.controller;

import com.oj.api.entity.dto.JudgeSubmitDto;
import com.oj.api.entity.vo.UserQuestionResultVo;
import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.judge.service.IJudgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/judge")
public class JudgeController extends BaseController {
    @Autowired
    private IJudgeService judgeService;

    @PostMapping("/doJudgeJavaCode")
    public Result<UserQuestionResultVo> doJudgeJavaCode(@RequestBody JudgeSubmitDto judgeSubmitDTO) {
        return Result.success(judgeService.doJudgeJavaCode(judgeSubmitDTO));
    }
}
