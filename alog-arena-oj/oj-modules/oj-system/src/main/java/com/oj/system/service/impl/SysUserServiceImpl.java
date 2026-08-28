package com.oj.system.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.oj.common.entity.Result;
import com.oj.common.enums.ResultCode;
import com.oj.system.entity.SysUserInfo;
import com.oj.system.mapper.SysUserMapper;
import com.oj.system.service.ISysUserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SysUserServiceImpl implements ISysUserService {

    @Autowired
    private SysUserMapper sysUserMapper;
    @Override
    public Result<String> login(String userAccount, String password) {
        //通过账号去数据库中查询，对应的用户信息
        LambdaQueryWrapper<SysUserInfo> queryWrapper = new LambdaQueryWrapper<>();
        SysUserInfo sysUserInfo = sysUserMapper.selectOne(queryWrapper
                .select(SysUserInfo::getPassword).eq(SysUserInfo::getUserAccount,userAccount));
        Result loginResult = new Result();
        if(sysUserInfo == null) {
            loginResult.setCode(ResultCode.FAILED_USER_NOT_EXISTS.getCode());
            loginResult.setMsg(ResultCode.FAILED_USER_NOT_EXISTS.getMsg());
            return loginResult;
        }
        if(sysUserInfo.getPassword().equals(password)) {
            loginResult.setCode(ResultCode.SUCCESS.getCode());
            loginResult.setMsg(ResultCode.SUCCESS.getMsg());
            return loginResult;
        }
        loginResult.setCode(ResultCode.FAILED_LOGIN.getCode());
        loginResult.setMsg(ResultCode.FAILED_LOGIN.getMsg());
        return loginResult;
    }
}
