package com.oj.friend.service;

import com.oj.friend.entity.dto.UserDto;

public interface IUserService {
    boolean sendCode(UserDto userDto);

    String codeLogin(String phone,String code);

    boolean logout(String normalizedToken);
}
