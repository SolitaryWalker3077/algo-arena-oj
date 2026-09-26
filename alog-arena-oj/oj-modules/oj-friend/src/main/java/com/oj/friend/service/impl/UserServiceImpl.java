package com.oj.friend.service.impl;

import cn.hutool.core.util.RandomUtil;
import com.oj.common.constants.Constants;
import com.oj.common.enums.ResultCode;
import com.oj.friend.entity.dto.UserDto;
import com.oj.friend.service.IUserService;
import com.oj.security.expection.ServiceException;
import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class UserServiceImpl implements IUserService {



    @Override
    public void sendCode(UserDto userDto) {
        if (!checkPhone(userDto.getPhone())) {
            throw new ServiceException(ResultCode.FAILED_USER_PHONE);
        }
        String code = RandomUtil.randomNumbers(6);
    }

    public  static boolean checkPhone(String phone) {
        Pattern regex = Pattern.compile("^1[2|3|4|5|6|7|8|9][0-9]\\d{8}$");
        Matcher m =  regex.matcher(phone);
        return m.matches();
    }
}
