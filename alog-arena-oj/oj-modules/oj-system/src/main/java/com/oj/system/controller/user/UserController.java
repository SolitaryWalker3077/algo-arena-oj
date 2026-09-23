package com.oj.system.controller.user;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.Result;
import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.user.dto.UserDto;
import com.oj.system.entity.user.dto.UserQueryDto;
import com.oj.system.service.user.IUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@Tag(name = "用户管理接口")
public class UserController extends BaseController {

    @Autowired
    private IUserService userService;

    @Operation(summary = "用户管理列表")
    @GetMapping("/list")
    public TableDataInfo list(UserQueryDto userQueryDTO) {
        return getDataTable(userService.list(userQueryDTO));
    }

    @PutMapping("/updateStatus")
    @Operation(summary = "设置用户状态")
    //todo 拉黑：限制用户操作   解禁：放开对于用户限制
    //更新数据库中用户的状态信息。
    public Result<Void> updateStatus(@RequestBody UserDto userDto) {
        return toResult(userService.updateStatus(userDto));
    }

}
