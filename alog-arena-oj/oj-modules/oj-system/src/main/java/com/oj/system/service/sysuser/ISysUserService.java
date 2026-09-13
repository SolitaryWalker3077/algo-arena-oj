package com.oj.system.service.sysuser;

import com.oj.common.entity.Result;
import com.oj.common.entity.vo.LoginUserVO;
import com.oj.system.entity.sysuser.dto.SysUserDto;

public interface ISysUserService {
    Result<String> login(String userAccount, String password);

    boolean logout(String token);

    Result<LoginUserVO> info(String token);

    int add(SysUserDto sysUserSaveDTO);




}
