package com.oj.system.controller.user;

import com.oj.common.controller.BaseController;
import com.oj.common.entity.TableDataInfo;
import com.oj.system.entity.user.dto.UserQueryDto;
import com.oj.system.service.user.IUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/user")
public class UserController extends BaseController {

    @Autowired
    private IUserService userService;

    @GetMapping("/list")
    public TableDataInfo list(UserQueryDto userQueryDTO) {
        return getDataTable(userService.list(userQueryDTO));
    }
}
