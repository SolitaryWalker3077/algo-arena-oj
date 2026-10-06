package com.oj.friend.controller.user;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.friend.entity.user.dto.UserSubmitDto;

import com.oj.friend.service.user.IUserQuestionService;

import com.oj.api.entity.vo.UserQuestionResultVo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user/question")
public class UserQuestionController extends BaseController {

    @Autowired
    private IUserQuestionService userQuestionService;

    //用户代码提交
    @PostMapping("/submit")
    public Result<UserQuestionResultVo> submit(@RequestBody UserSubmitDto submitDto) {
        return userQuestionService.submit(submitDto);
    }
}
