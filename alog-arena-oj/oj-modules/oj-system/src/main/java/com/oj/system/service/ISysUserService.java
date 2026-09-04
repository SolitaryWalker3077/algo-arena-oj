package com.oj.system.service;

import com.oj.common.entity.Result;
import com.oj.system.entity.dto.SysUserDto;

public interface ISysUserService {
    Result<String> login(String userAccount, String password);

    int add(SysUserDto sysUserSaveDTO);
}
