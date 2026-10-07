package com.oj.friend.controller.user;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.friend.entity.user.dto.UserSubmitDto;

import com.oj.friend.service.user.IUserQuestionService;

import com.oj.api.entity.vo.UserQuestionResultVo;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "用户答题")
@RequestMapping("/user/question")
public class UserQuestionController extends BaseController {

    @Autowired
    private IUserQuestionService userQuestionService;

    //用户代码提交
    @Operation(summary = "用户代码提交")
    @PostMapping("/submit")
    public Result<UserQuestionResultVo> submit(@RequestBody UserSubmitDto submitDto) {
        return userQuestionService.submit(submitDto);
    }

    @Operation(summary = "rabbit版本用户代码提交")
    @PostMapping("/rabbit/submit")
    public Result<Void>  rabbitSubmit(@RequestBody UserSubmitDto submitDto) {
        return toResult(userQuestionService.rabbitSubmit(submitDto));
    }
}
