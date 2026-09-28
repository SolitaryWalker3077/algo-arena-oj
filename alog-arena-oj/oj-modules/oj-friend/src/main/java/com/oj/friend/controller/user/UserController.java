package com.oj.friend.controller.user;

import com.oj.common.constants.HttpConstants;
import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.common.entity.vo.LoginUserVO;
import com.oj.friend.entity.user.dto.UserDto;
import com.oj.friend.service.user.IUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

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

    @Operation(summary = "登录注册")
    @PostMapping("/code/login")
    public Result<String> codeLogin(@RequestBody UserDto userDto) {
        return Result.success(userService.codeLogin(userDto.getPhone(),userDto.getCode()));
    }

    //退出登录:
    //接口地址:/friend/user/logout
    @Operation(summary = "退出登录")
    @DeleteMapping("/logout")
    public Result<Void> logout(@RequestHeader(HttpConstants.AUTHENTICATION) String token) {
        // 如果 token 包含指定前缀，则移除该前缀；否则保持原值
        String normalizedToken = token.startsWith(HttpConstants.PREFIX)
                ? token.substring(HttpConstants.PREFIX.length())
                : token;
        return toResult(userService.logout(normalizedToken));
    }

    //获取用户信息
    //接口地址: /friend/sysuser/info
    @Operation(summary = "当前用户信息", description = "根据认证令牌获取当前管理员昵称")
    @GetMapping("/info")
    public Result<LoginUserVO> info(@RequestHeader(HttpConstants.AUTHENTICATION) String token) {
        // 如果 token 包含指定前缀，则移除该前缀；否则保持原值
        String normalizedToken = token.startsWith(HttpConstants.PREFIX)
                ? token.substring(HttpConstants.PREFIX.length())
                : token;
        return userService.info(normalizedToken);
    }
}
