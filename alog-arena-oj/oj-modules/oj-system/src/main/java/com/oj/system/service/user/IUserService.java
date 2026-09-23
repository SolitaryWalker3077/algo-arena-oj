package com.oj.system.service.user;

import com.oj.system.entity.user.dto.UserQueryDto;
import com.oj.system.entity.user.vo.UserVo;

import java.util.List;

public interface IUserService {


    List<UserVo> list(UserQueryDto userQueryDTO);
}
