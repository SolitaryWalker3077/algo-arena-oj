package com.oj.friend.service;

import com.oj.friend.entity.dto.UserDto;

public interface IUserService {
    boolean sendCode(UserDto userDto);
}
