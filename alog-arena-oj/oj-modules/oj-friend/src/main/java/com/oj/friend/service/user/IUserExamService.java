package com.oj.friend.service.user;

import com.oj.common.entity.TableDataInfo;
import com.oj.friend.entity.exam.dto.ExamQueryDto;

public interface IUserExamService {
    int enter(String token, Long examId);

    TableDataInfo list(ExamQueryDto examQueryDto);
}
