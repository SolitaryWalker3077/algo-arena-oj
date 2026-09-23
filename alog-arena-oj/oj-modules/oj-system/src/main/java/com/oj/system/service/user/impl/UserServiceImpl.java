package com.oj.system.service.user.impl;

import com.github.pagehelper.PageHelper;
import com.oj.system.entity.user.dto.UserQueryDto;
import com.oj.system.entity.user.vo.UserVo;
import com.oj.system.mapper.user.UserMapper;
import com.oj.system.service.user.IUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserServiceImpl implements IUserService {

    @Autowired
    private UserMapper userMapper;

    @Override
    public List<UserVo> list(UserQueryDto userQueryDTO) {
        PageHelper.startPage(userQueryDTO.getPageNum(), userQueryDTO.getPageSize());
        return userMapper.selectUserList(userQueryDTO);
    }
    
}
