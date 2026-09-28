package com.oj.friend.service.user;

import com.oj.common.entity.Result;
import com.oj.common.entity.vo.LoginUserVO;
import com.oj.friend.entity.user.dto.UserDto;

public interface IUserService {
    boolean sendCode(UserDto userDto);

    String codeLogin(String phone,String code);

    boolean logout(String normalizedToken);

    Result<LoginUserVO> info(String normalizedToken);
}
