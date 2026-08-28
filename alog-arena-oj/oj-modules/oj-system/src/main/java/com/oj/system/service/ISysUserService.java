package com.oj.system.service;

import com.oj.common.entity.Result;

public interface ISysUserService {
    Result<String> login(String userAccount, String password);
}
