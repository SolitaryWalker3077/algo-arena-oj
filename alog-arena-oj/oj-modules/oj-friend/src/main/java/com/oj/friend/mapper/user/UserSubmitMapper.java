package com.oj.friend.mapper.user;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.oj.friend.entity.user.UserSubmit;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface UserSubmitMapper extends BaseMapper<UserSubmit> {
    UserSubmit selectCurrentUserSubmit(@Param("userId") Long userId,
                                       @Param("examId") Long examId,
                                       @Param("questionId") Long questionId,
                                       @Param("currentTime") String currentTime);

    List<Long> selectHostQuestionList();
}
