package com.oj.system.mapper.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.system.entity.user.UserInfo;
import com.oj.system.entity.user.dto.UserQueryDto;
import com.oj.system.entity.user.vo.UserVo;

import java.util.List;

public interface UserMapper extends BaseMapper<UserInfo> {

    List<UserVo> selectUserList(UserQueryDto userQueryDTO);
}
