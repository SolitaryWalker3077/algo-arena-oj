package com.oj.friend.controller;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.friend.entity.dto.UserDto;
import com.oj.friend.service.IUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
@Tag(name = "用户")
public class UserController extends BaseController {

    @Autowired
    private IUserService userService;


    @PostMapping("/sendCode")
    @Operation(summary = "发送验证码")
    public Result<Void> sendCode(@RequestBody UserDto userDto) {
        return toResult(userService.sendCode(userDto));
    }
}
