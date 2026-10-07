package com.oj.job.mapper.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.job.entity.UserSubmit;

import java.util.List;

public interface UserSubmitMapper extends BaseMapper<UserSubmit> {

    List<Long> selectHostQuestionList();
}
