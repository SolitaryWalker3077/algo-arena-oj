package com.oj.system.controller;


import com.oj.common.entity.Result;
import com.oj.system.entity.dto.LoginDto;
import com.oj.system.service.ISysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sysuser")
public class SysUserController {

    @Autowired
    private ISysUserService sysUserService;

    @GetMapping("/login")
    public Result<String> login(@RequestBody LoginDto loginDTO) {

        return sysUserService.login(loginDTO.getUserAccount(),loginDTO.getPassword());
    }
}
