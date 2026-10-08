package com.oj.friend.service.user;

import com.oj.common.entity.PageQueryDto;
import com.oj.common.entity.TableDataInfo;

public interface IUserMessageService {
    TableDataInfo list(PageQueryDto dto);
}
