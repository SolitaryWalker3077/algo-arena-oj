package com.oj.friend.service.user;

import com.oj.common.entity.Result;
import com.oj.common.entity.vo.LoginUserVO;
import com.oj.friend.entity.user.dto.UserDto;
import com.oj.friend.entity.user.dto.UserUpdateDto;
import com.oj.friend.entity.user.vo.UserVo;

public interface IUserService {
    boolean sendCode(UserDto userDto);

    String codeLogin(String phone,String code);

    boolean logout(String normalizedToken);

    Result<LoginUserVO> info(String normalizedToken);

    UserVo detail();

    int edit(UserUpdateDto userUpdateDto);

    int updateHeadImage(String headImage);
}
